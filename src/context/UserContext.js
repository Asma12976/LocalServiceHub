import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  onAuthStateChanged,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';

import * as FileSystem from 'expo-file-system/legacy';

import {
  auth,
  db,
} from '../config/firebase';


// =====================================================
// CLOUDINARY CONFIG
// =====================================================

const CLOUDINARY_CLOUD_NAME = 'ehirq7yx';

const CLOUDINARY_UPLOAD_PRESET =
  'localservicehub_profiles';

const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;


// =====================================================
// USER CONTEXT
// =====================================================

const UserContext = createContext(undefined);


// =====================================================
// USER PROVIDER
// =====================================================

export function UserProvider({ children }) {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);


  // ===================================================
  // AUTH STATE
  // ===================================================

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (firebaseUser) => {

          // -------------------------------------------
          // No logged-in user
          // -------------------------------------------

          if (!firebaseUser) {

            setUser(null);
            setLoading(false);

            return;
          }


          // -------------------------------------------
          // Default Firebase Auth profile
          // -------------------------------------------

          let profile = {

            uid: firebaseUser.uid,

            name:
              firebaseUser.displayName ||
              'User',

            email:
              firebaseUser.email ||
              '',

            phone: '',

            city: '',

            area: '',

            role: 'customer',

            photoURL:
              firebaseUser.photoURL ||
              '',
          };


          // -------------------------------------------
          // Get Firestore profile
          // -------------------------------------------

          try {

            const userRef =
              doc(
                db,
                'users',
                firebaseUser.uid
              );


            const snap =
              await getDoc(userRef);


            if (snap.exists()) {

              const data = snap.data();


              profile = {

                ...profile,

                name:
                  data.name ||
                  profile.name,

                email:
                  data.email ||
                  profile.email,

                phone:
                  data.phone ||
                  '',

                city:
                  data.city ||
                  '',

                area:
                  data.area ||
                  '',

                role:
                  data.role ||
                  profile.role,

                photoURL:
                  data.photoURL ||
                  profile.photoURL,
              };
            }

          } catch (err) {

            console.log(
              'Could not load Firestore profile:',
              err?.message
            );
          }


          // -------------------------------------------
          // Set user
          // -------------------------------------------

          setUser(profile);

          setLoading(false);
        }
      );


    return unsubscribe;

  }, []);


  // =====================================================
  // UPDATE PROFILE
  // =====================================================

  const updateProfile =
    async (updates) => {

      const firebaseUser =
        auth.currentUser;


      if (!firebaseUser) {

        throw new Error(
          'No logged-in user'
        );
      }


      // -----------------------------------------------
      // Update Firestore
      // -----------------------------------------------

      const userRef =
        doc(
          db,
          'users',
          firebaseUser.uid
        );


      await setDoc(
        userRef,
        updates,
        {
          merge: true,
        }
      );


      // -----------------------------------------------
      // Update Firebase Auth display name
      // -----------------------------------------------

      if (
        updates.name &&
        updates.name !==
          firebaseUser.displayName
      ) {

        await updateAuthProfile(
          firebaseUser,
          {
            displayName:
              updates.name,
          }
        );
      }


      // -----------------------------------------------
      // Update local state
      // -----------------------------------------------

      setUser((prev) => ({
        ...prev,
        ...updates,
      }));
    };


  // =====================================================
  // UPLOAD PROFILE PHOTO TO CLOUDINARY
  // =====================================================

  const uploadProfilePhoto =
    async (localUri) => {

      const firebaseUser =
        auth.currentUser;


      // -----------------------------------------------
      // Check logged-in user
      // -----------------------------------------------

      if (!firebaseUser) {

        throw new Error(
          'No logged-in user'
        );
      }


      // -----------------------------------------------
      // Check photo URI
      // -----------------------------------------------

      if (!localUri) {

        throw new Error(
          'No photo was selected.'
        );
      }


      try {

        console.log(
          'Uploading profile photo to Cloudinary...'
        );


        // =============================================
        // Upload to Cloudinary
        // =============================================

        const response =
          await FileSystem.uploadAsync(
            CLOUDINARY_UPLOAD_URL,
            localUri,
            {
              httpMethod: 'POST',

              uploadType:
                FileSystem.FileSystemUploadType
                  .MULTIPART,

              fieldName: 'file',

              mimeType: 'image/jpeg',

              parameters: {

                upload_preset:
                  CLOUDINARY_UPLOAD_PRESET,

                folder:
                  'profile_photos',
              },
            }
          );


        console.log(
          'Cloudinary upload status:',
          response.status
        );


        // =============================================
        // Check response
        // =============================================

        if (
          response.status < 200 ||
          response.status >= 300
        ) {

          console.log(
            'Cloudinary error response:',
            response.body
          );


          let errorMessage =
            'Photo upload failed.';


          try {

            const errorData =
              JSON.parse(
                response.body
              );


            errorMessage =
              errorData?.error?.message ||
              errorMessage;

          } catch (parseError) {

            console.log(
              'Could not parse Cloudinary error.'
            );
          }


          throw new Error(
            errorMessage
          );
        }


        // =============================================
        // Parse Cloudinary response
        // =============================================

        let cloudinaryData;

        try {

          cloudinaryData =
            JSON.parse(
              response.body
            );

        } catch (parseError) {

          throw new Error(
            'Invalid response received from Cloudinary.'
          );
        }


        // =============================================
        // Get secure URL
        // =============================================

        const photoURL =
          cloudinaryData?.secure_url;


        if (!photoURL) {

          throw new Error(
            'Cloudinary did not return a photo URL.'
          );
        }


        console.log(
          'Cloudinary photo URL received.'
        );


        // =============================================
        // Save URL to Firestore
        // =============================================

        await setDoc(
          doc(
            db,
            'users',
            firebaseUser.uid
          ),
          {
            photoURL: photoURL,
          },
          {
            merge: true,
          }
        );


        // =============================================
        // Update Firebase Auth photoURL
        // =============================================

        try {

          await updateAuthProfile(
            firebaseUser,
            {
              photoURL: photoURL,
            }
          );

        } catch (authError) {

          console.log(
            'Auth photoURL update failed:',
            authError?.message
          );
        }


        // =============================================
        // Update local state
        // =============================================

        setUser((prev) => ({

          ...prev,

          photoURL: photoURL,

        }));


        // =============================================
        // Return Cloudinary URL
        // =============================================

        return photoURL;


      } catch (err) {

        console.log(
          'Cloudinary profile photo upload error:',
          err
        );


        throw new Error(
          err?.message ||
          'Could not upload profile photo.'
        );
      }
    };


  // =====================================================
  // PROVIDER
  // =====================================================

  return (

    <UserContext.Provider
      value={{
        user,
        loading,
        updateProfile,
        uploadProfilePhoto,
      }}
    >

      {children}

    </UserContext.Provider>
  );
}


// =====================================================
// USE USER HOOK
// =====================================================

export function useUser() {

  const ctx =
    useContext(UserContext);


  if (!ctx) {

    throw new Error(
      'useUser must be used inside a <UserProvider>'
    );
  }


  return ctx;
}